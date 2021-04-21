import { JSBI } from '@ubeswap/sdk'
import React, { useMemo } from 'react'
import styled from 'styled-components'
import { OutlineCard } from '../../components/Card'
import { AutoColumn } from '../../components/Column'
import PoolCard from '../../components/earn/PoolCard'
import { CardNoise, CardSection, DataCard } from '../../components/earn/styled'
import Loader from '../../components/Loader'
import { RowBetween } from '../../components/Row'
import { BIG_INT_ZERO } from '../../constants'
import { StakingInfo, useStakingInfo } from '../../state/stake/hooks'
import { ExternalLink, TYPE } from '../../theme'
import { COUNTDOWN_END, LaunchCountdown } from './LaunchCountdown'

const PageWrapper = styled(AutoColumn)`
  max-width: 640px;
  width: 100%;
`

const TopSection = styled(AutoColumn)`
  max-width: 720px;
  width: 100%;
`

const PoolSection = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  column-gap: 10px;
  row-gap: 15px;
  width: 100%;
  justify-self: center;
`

const DataRow = styled(RowBetween)`
  ${({ theme }) => theme.mediaWidth.upToSmall`
flex-direction: column;
`};
`

export default function Earn() {
  // staking info for connected account
  const stakingInfos = useStakingInfo()

  /**
   * only show staking cards with balance
   * @todo only account for this if rewards are inactive
   * @todo (sharad) - sot
   */
  const stakingInfosWithBalance = useMemo(
    () => stakingInfos?.filter((s: StakingInfo) => JSBI.greaterThan(s.stakedAmount.raw, BIG_INT_ZERO)),
    [stakingInfos]
  )

  /**
   * Sort staking Info by provided liquidity Amount
   */
  const sortedStakingInfos = useMemo(
    () =>
      stakingInfos
        ?.slice()
        .sort((a: StakingInfo, b: StakingInfo) => JSBI.toNumber(JSBI.subtract(b.stakedAmount.raw, a.stakedAmount.raw))),
    [stakingInfos]
  )

  // toggle copy if rewards are inactive
  const stakingRewardsExist = true

  function renderStakingInfos(stakingInfos: readonly StakingInfo[] | undefined) {
    return stakingInfos
      ?.filter((si) => si.active)
      .map((stakingInfo) => {
        // need to sort by added liquidity here
        return <PoolCard key={stakingInfo.stakingRewardAddress} stakingInfo={stakingInfo} />
      })
  }

  function renderInactiveStakingInfo(inactiveStakingInfos: StakingInfo[] | undefined) {
    return (
      <>
        <OutlineCard>No active pools</OutlineCard>
        {renderStakingInfos(inactiveStakingInfos)}
      </>
    )
  }

  const isGenesisOver = COUNTDOWN_END < new Date().getTime()

  return (
    <PageWrapper gap="lg" justify="center">
      {isGenesisOver && (
        <TopSection gap="md">
          <DataCard>
            <CardNoise />
            <CardSection>
              <AutoColumn gap="md">
                <RowBetween>
                  <TYPE.white fontWeight={600}>Ubeswap liquidity mining</TYPE.white>
                </RowBetween>
                <RowBetween>
                  <TYPE.white fontSize={14}>
                    Deposit your Liquidity Provider tokens to receive UBE, the Ubeswap protocol governance token.
                  </TYPE.white>
                </RowBetween>{' '}
                <ExternalLink
                  style={{ color: 'white', textDecoration: 'underline' }}
                  href="https://docs.ubeswap.org/faq"
                  target="_blank"
                >
                  <TYPE.white fontSize={14}>Read more about UBE</TYPE.white>
                </ExternalLink>
              </AutoColumn>
            </CardSection>
            <CardNoise />
          </DataCard>
        </TopSection>
      )}

      <AutoColumn gap="lg" style={{ width: '100%', maxWidth: '720px' }}>
        <DataRow style={{ alignItems: 'baseline' }}>
          <TYPE.mediumHeader style={{ marginTop: '0.5rem' }}>Farms</TYPE.mediumHeader>
          <div>
            {!isGenesisOver && (
              <span>
                Rewards begin on{' '}
                {new Date(COUNTDOWN_END).toLocaleString('en-us', {
                  timeZoneName: 'short',
                })}
              </span>
            )}
          </div>
          {/* TODO(igm): show TVL here */}
        </DataRow>

        {!isGenesisOver && <LaunchCountdown />}

        <PoolSection>
          {stakingRewardsExist && sortedStakingInfos?.length === 0 ? (
            <Loader style={{ margin: 'auto' }} />
          ) : !stakingRewardsExist ? (
            renderInactiveStakingInfo(stakingInfosWithBalance)
          ) : (
            renderStakingInfos(sortedStakingInfos)
          )}
        </PoolSection>
      </AutoColumn>
    </PageWrapper>
  )
}
