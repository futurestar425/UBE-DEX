import { useContractKit } from '@celo-tools/use-contractkit'
import { ChainId as UbeswapChainId, cUSD, JSBI } from '@ubeswap/sdk'
import StakedAmountsHelper from 'components/earn/StakedAmountsHelper'
import React, { useCallback, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, RouteComponentProps } from 'react-router-dom'
import { usePairStakingInfo } from 'state/stake/useStakingInfo'
import styled from 'styled-components'
import { CountUp } from 'use-count-up'

import { ButtonEmpty, ButtonPrimary } from '../../components/Button'
import { AutoColumn } from '../../components/Column'
import DoubleCurrencyLogo from '../../components/DoubleLogo'
import ClaimRewardModal from '../../components/earn/ClaimRewardModal'
import StakingModal from '../../components/earn/StakingModal'
import { CardBGImage, CardNoise, CardSection, DataCard } from '../../components/earn/styled'
import UnstakingModal from '../../components/earn/UnstakingModal'
import { RowBetween, RowFixed } from '../../components/Row'
import { BIG_INT_SECONDS_IN_WEEK, BIG_INT_ZERO } from '../../constants'
import { usePair } from '../../data/Reserves'
import { useCurrency } from '../../hooks/Tokens'
import { useColor } from '../../hooks/useColor'
import usePrevious from '../../hooks/usePrevious'
import { useWalletModalToggle } from '../../state/application/hooks'
import { usePairMultiStakingInfo } from '../../state/stake/hooks'
import { useTokenBalance } from '../../state/wallet/hooks'
import { ExternalLinkIcon, TYPE } from '../../theme'
import { currencyId } from '../../utils/currencyId'
import { useStakingPoolValue } from './useStakingPoolValue'

const PageWrapper = styled(AutoColumn)`
  max-width: 640px;
  width: 100%;
`

const PositionInfo = styled(AutoColumn)<{ dim: any }>`
  position: relative;
  max-width: 640px;
  width: 100%;
  opacity: ${({ dim }) => (dim ? 0.6 : 1)};
`

const BottomSection = styled(AutoColumn)`
  border-radius: 12px;
  width: 100%;
  position: relative;
`

const StyledDataCard = styled(DataCard)<{ bgColor?: any; showBackground?: any }>`
  background: radial-gradient(76.02% 75.41% at 1.84% 0%, #1e1a31 0%, #3d51a5 100%);
  z-index: 2;
  background: ${({ theme, bgColor, showBackground }) =>
    `radial-gradient(91.85% 100% at 1.84% 0%, ${bgColor} 0%,  ${showBackground ? theme.black : theme.bg5} 100%) `};
  ${({ showBackground }) =>
    showBackground &&
    `  box-shadow: 0px 0px 1px rgba(0, 0, 0, 0.01), 0px 4px 8px rgba(0, 0, 0, 0.04), 0px 16px 24px rgba(0, 0, 0, 0.04),
    0px 24px 32px rgba(0, 0, 0, 0.01);`}
`

const StyledBottomCard = styled(DataCard)<{ dim: any }>`
  background: ${({ theme }) => theme.bg3};
  opacity: ${({ dim }) => (dim ? 0.4 : 1)};
  margin-top: -40px;
  padding: 0 1.25rem 1rem 1.25rem;
  padding-top: 32px;
  z-index: 1;
`

const PoolData = styled(DataCard)`
  background: none;
  border: 1px solid ${({ theme }) => theme.bg4};
  padding: 1rem;
  z-index: 1;
`

const VoteCard = styled(DataCard)`
  background: radial-gradient(76.02% 75.41% at 1.84% 0%, #27ae60 0%, #000000 100%);
  overflow: hidden;
`

const DataRow = styled(RowBetween)`
  justify-content: center;
  gap: 12px;

  ${({ theme }) => theme.mediaWidth.upToSmall`
    flex-direction: column;
    gap: 12px;
  `};
`

export default function Manage({
  match: {
    params: { currencyIdA, currencyIdB, stakingAddress },
  },
}: RouteComponentProps<{ currencyIdA: string; currencyIdB: string; stakingAddress: string }>) {
  const { t } = useTranslation()
  const { address: account, network } = useContractKit()
  const { chainId } = network

  // get currencies and pair
  const [tokenA, tokenB] = [useCurrency(currencyIdA) ?? undefined, useCurrency(currencyIdB) ?? undefined]

  const [, stakingTokenPair] = usePair(tokenA, tokenB)
  const singleStakingInfo = usePairStakingInfo(stakingTokenPair)
  const multiStakingInfo = usePairMultiStakingInfo(singleStakingInfo, stakingAddress)
  const externalSingleStakingInfo = usePairStakingInfo(stakingTokenPair, stakingAddress)

  // Check external before we check single staking
  const stakingInfo = multiStakingInfo || externalSingleStakingInfo || singleStakingInfo

  // detect existing unstaked LP position to show add button if none found
  const userLiquidityUnstaked = useTokenBalance(account ?? undefined, stakingInfo?.stakedAmount?.token)
  const showAddLiquidityButton = Boolean(stakingInfo?.stakedAmount?.equalTo('0') && userLiquidityUnstaked?.equalTo('0'))

  // toggle for staking modal and unstaking modal
  const [showStakingModal, setShowStakingModal] = useState(false)
  const [showUnstakingModal, setShowUnstakingModal] = useState(false)
  const [showClaimRewardModal, setShowClaimRewardModal] = useState(false)

  // fade cards if nothing staked or nothing earned yet
  const disableTop = !stakingInfo?.stakedAmount || stakingInfo.stakedAmount.equalTo(JSBI.BigInt(0))

  const token = tokenA === cUSD[chainId as unknown as UbeswapChainId] ? tokenB : tokenA
  const backgroundColor = useColor(token ?? undefined)

  // get CUSD value of staked LP tokens
  const {
    valueCUSD: valueOfTotalStakedAmountInCUSD,
    userValueCUSD,
    userAmountTokenA,
    userAmountTokenB,
  } = useStakingPoolValue(stakingInfo, stakingTokenPair)

  stakingInfo?.rewardRates?.sort((a, b) =>
    a.multiply(BIG_INT_SECONDS_IN_WEEK).lessThan(b.multiply(BIG_INT_SECONDS_IN_WEEK)) ? 1 : -1
  )
  const countUpAmounts =
    stakingInfo?.earnedAmounts
      ?.sort((a, b) => (a.lessThan(b) ? 1 : -1))
      .map((earnedAmount) => earnedAmount.toFixed(6) ?? '0') || []

  const countUpAmountsPrevious = usePrevious(countUpAmounts) ?? countUpAmounts

  const toggleWalletModal = useWalletModalToggle()

  const handleDepositClick = useCallback(() => {
    if (account) {
      setShowStakingModal(true)
    } else {
      toggleWalletModal()
    }
  }, [account, toggleWalletModal])

  return (
    <PageWrapper gap="lg" justify="center">
      <RowBetween style={{ gap: '24px' }}>
        <TYPE.mediumHeader style={{ margin: 0 }}>
          {tokenA?.symbol}-{tokenB?.symbol} {t('liquidityMining')}
        </TYPE.mediumHeader>
        <DoubleCurrencyLogo currency0={tokenA ?? undefined} currency1={tokenB ?? undefined} size={24} />
      </RowBetween>

      <DataRow style={{ gap: '24px' }}>
        <PoolData>
          <AutoColumn gap="sm">
            <TYPE.body style={{ margin: 0 }}>{t('totalDeposits')}</TYPE.body>
            <TYPE.body fontSize={24} fontWeight={500}>
              {valueOfTotalStakedAmountInCUSD
                ? `$${
                    valueOfTotalStakedAmountInCUSD.lessThan('1')
                      ? valueOfTotalStakedAmountInCUSD.toFixed(2, {
                          groupSeparator: ',',
                        })
                      : valueOfTotalStakedAmountInCUSD.toFixed(0, {
                          groupSeparator: ',',
                        })
                  }`
                : '-'}
            </TYPE.body>
          </AutoColumn>
        </PoolData>
        <PoolData>
          <AutoColumn gap="sm">
            {stakingInfo?.active && (
              <>
                <TYPE.body style={{ margin: 0 }}>{t('poolRate')}</TYPE.body>
                {stakingInfo?.totalRewardRates
                  ?.filter((rewardRate) => !rewardRate.equalTo('0'))
                  ?.map((rewardRate) => {
                    return (
                      <TYPE.body fontSize={24} fontWeight={500} key={rewardRate.token.symbol}>
                        {rewardRate?.multiply(BIG_INT_SECONDS_IN_WEEK)?.toFixed(0, { groupSeparator: ',' }) ?? '-'}
                        {` ${rewardRate.token.symbol} / week`}
                      </TYPE.body>
                    )
                  })}
              </>
            )}
          </AutoColumn>
        </PoolData>
      </DataRow>

      {showAddLiquidityButton && (
        <VoteCard>
          <CardBGImage />
          <CardNoise />
          <CardSection>
            <AutoColumn gap="md">
              <RowBetween>
                <TYPE.white fontWeight={600}>Step 1. Get UBE-LP Liquidity tokens</TYPE.white>
              </RowBetween>
              <RowBetween style={{ marginBottom: '1rem' }}>
                <TYPE.white fontSize={14}>
                  {`UBE-LP tokens are required. Once you've added liquidity to the ${tokenA?.symbol}-${tokenB?.symbol} pool you can stake your liquidity tokens on this page.`}
                </TYPE.white>
              </RowBetween>
              <ButtonPrimary
                padding="8px"
                borderRadius="8px"
                width={'fit-content'}
                as={Link}
                to={`/add/${tokenA && currencyId(tokenA)}/${tokenB && currencyId(tokenB)}`}
              >
                {`Add ${tokenA?.symbol}-${tokenB?.symbol} liquidity`}
              </ButtonPrimary>
            </AutoColumn>
          </CardSection>
          <CardBGImage />
          <CardNoise />
        </VoteCard>
      )}

      {stakingInfo && (
        <>
          <StakingModal
            isOpen={showStakingModal}
            onDismiss={() => setShowStakingModal(false)}
            stakingInfo={stakingInfo}
            userLiquidityUnstaked={userLiquidityUnstaked}
          />
          <UnstakingModal
            isOpen={showUnstakingModal}
            onDismiss={() => setShowUnstakingModal(false)}
            stakingInfo={stakingInfo}
          />
          <ClaimRewardModal
            isOpen={showClaimRewardModal}
            onDismiss={() => setShowClaimRewardModal(false)}
            stakingInfo={stakingInfo}
          />
        </>
      )}

      <PositionInfo gap="lg" justify="center" dim={showAddLiquidityButton}>
        <BottomSection gap="lg" justify="center">
          <StyledDataCard disabled={disableTop} bgColor={backgroundColor} showBackground={!showAddLiquidityButton}>
            <CardSection>
              <CardNoise />
              <AutoColumn gap="md">
                <RowBetween>
                  <TYPE.white fontWeight={600}>{t('yourLiquidityDeposits')}</TYPE.white>
                </RowBetween>
                <RowBetween style={{ alignItems: 'baseline', flexWrap: 'wrap' }}>
                  <TYPE.white fontSize={36} fontWeight={600}>
                    {stakingInfo?.stakedAmount?.toSignificant(6) ?? '-'}
                  </TYPE.white>
                  <RowFixed>
                    <TYPE.white>
                      UBE-LP {tokenA?.symbol}-{tokenB?.symbol}
                    </TYPE.white>
                    {stakingInfo && (
                      <PairLinkIcon
                        href={`https://info.ubeswap.org/pair/${stakingInfo.stakingToken.address.toLowerCase()}`}
                      />
                    )}
                  </RowFixed>
                </RowBetween>
                {stakingInfo?.stakedAmount && stakingInfo.stakedAmount.greaterThan('0') && (
                  <RowBetween>
                    <RowFixed>
                      <TYPE.white>
                        {t('currentValue')}:{' '}
                        {userValueCUSD
                          ? `$${userValueCUSD.toFixed(2, {
                              separator: ',',
                            })}`
                          : '--'}
                      </TYPE.white>
                      <StakedAmountsHelper userAmountTokenA={userAmountTokenA} userAmountTokenB={userAmountTokenB} />
                    </RowFixed>
                  </RowBetween>
                )}
              </AutoColumn>
            </CardSection>
          </StyledDataCard>
          <StyledBottomCard dim={stakingInfo?.stakedAmount?.equalTo(JSBI.BigInt(0))}>
            <CardNoise />
            <AutoColumn gap="sm">
              <RowBetween>
                <div>
                  <TYPE.black>{t('yourUnclaimedRewards')}</TYPE.black>
                </div>
                {stakingInfo?.earnedAmounts?.some((earnedAmount) => JSBI.notEqual(BIG_INT_ZERO, earnedAmount?.raw)) && (
                  <ButtonEmpty
                    padding="8px"
                    borderRadius="8px"
                    width="fit-content"
                    onClick={() => setShowClaimRewardModal(true)}
                  >
                    {t('claim')}
                  </ButtonEmpty>
                )}
              </RowBetween>
              {stakingInfo?.rewardRates
                // show if rewards are more than zero or unclaimed are greater than zero
                ?.filter((rewardRate, idx) => rewardRate.greaterThan('0') || countUpAmounts[idx])
                ?.map((rewardRate, idx) => (
                  <RowBetween style={{ alignItems: 'baseline' }} key={rewardRate.token.symbol}>
                    <TYPE.largeHeader fontSize={36} fontWeight={600}>
                      {countUpAmounts[idx] ? (
                        <CountUp
                          key={countUpAmounts[idx]}
                          isCounting
                          decimalPlaces={parseFloat(countUpAmounts[idx]) < 0.0001 ? 6 : 4}
                          start={parseFloat(countUpAmountsPrevious[idx] || countUpAmounts[idx])}
                          end={parseFloat(countUpAmounts[idx])}
                          thousandsSeparator={','}
                          duration={1}
                        />
                      ) : (
                        '0'
                      )}
                    </TYPE.largeHeader>
                    <TYPE.black fontSize={16} fontWeight={500}>
                      <span role="img" aria-label="wizard-icon" style={{ marginRight: '8px ' }}>
                        ⚡
                      </span>
                      {stakingInfo?.active
                        ? rewardRate.multiply(BIG_INT_SECONDS_IN_WEEK)?.toSignificant(4, { groupSeparator: ',' }) ?? '-'
                        : '0'}
                      {` ${rewardRate.token.symbol} / ${t('week')}`}
                    </TYPE.black>
                  </RowBetween>
                ))}
            </AutoColumn>
          </StyledBottomCard>
        </BottomSection>
        <TYPE.main style={{ textAlign: 'center' }} fontSize={14}>
          <span role="img" aria-label="wizard-icon" style={{ marginRight: '8px' }}>
            ⭐️
          </span>
          {t('withdrawTip')}
        </TYPE.main>

        {!showAddLiquidityButton && (
          <DataRow style={{ marginBottom: '1rem' }}>
            {stakingInfo && stakingInfo.active && (
              <ButtonPrimary padding="8px" borderRadius="8px" width="160px" onClick={handleDepositClick}>
                {stakingInfo?.stakedAmount?.greaterThan(JSBI.BigInt(0))
                  ? t('deposit')
                  : `${t('deposit')} UBE-LP Tokens`}
              </ButtonPrimary>
            )}

            {stakingInfo?.stakedAmount?.greaterThan(JSBI.BigInt(0)) && (
              <>
                <ButtonPrimary
                  padding="8px"
                  borderRadius="8px"
                  width="160px"
                  onClick={() => setShowUnstakingModal(true)}
                >
                  {t('withdraw')}
                </ButtonPrimary>
              </>
            )}
            {stakingInfo && !stakingInfo.active && (
              <TYPE.main style={{ textAlign: 'center' }} fontSize={14}>
                Staking Rewards inactive for this pair.
              </TYPE.main>
            )}
          </DataRow>
        )}
        {!userLiquidityUnstaked ? null : userLiquidityUnstaked.equalTo('0') ? null : !stakingInfo?.active ? null : (
          <TYPE.main>{userLiquidityUnstaked.toSignificant(6)} UBE LP tokens available</TYPE.main>
        )}
      </PositionInfo>
    </PageWrapper>
  )
}

const PairLinkIcon = styled(ExternalLinkIcon)`
  svg {
    stroke: ${(props) => props.theme.primary1};
  }
`
