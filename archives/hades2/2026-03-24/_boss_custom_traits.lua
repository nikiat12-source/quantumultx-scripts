local BossOriginalStartRoom = StartRoom

function BossApplyCustomTraits()
	if CurrentRun == nil or CurrentRun.Hero == nil or CurrentRun.Hero.IsDead then
		return
	end
	if CurrentRun.BossCustomTraitsApplied then
		return
	end

	CurrentRun.BossCustomTraitsApplied = true

	local startTraits =
	{
		"FocusDamageShaveBoon",
		"SlamExplosionBoon",
		"PoseidonStatusBoon",
		"AmplifyConeBoon",
		"ElementalHealthBoon",
		"ApolloRetaliateBoon",
		"PerfectDamageBonusBoon",
		"BlindChanceBoon",
		"ApolloMissStrikeBoon",
		"ApolloCastAreaBoon",
		"DoubleStrikeChanceBoon",
		"DoubleExManaBoon",
		"ElementalRallyBoon",
		"ZeusManaBoltBoon",
		"BoltRetaliateBoon",
		"FocusLightningBoon",
		"DoubleBoltBoon",
		"EchoExpirationBoon",
		"LightningDebuffGeneratorBoon",
		"SpawnKillBoon",
		"ElementalDamageFloorBoon",
		"BoonGrowthBoon",
		"SlowExAttackBoon",
		"RootDurationBoon",
		"InstantRootKill",
		"ElementalDamageCapBoon",
		"OmegaZeroBurnBoon",
		"FireballManaSpecialBoon",
		"BurnExplodeBoon",
		"BurnArmorBoon",
		"BurnStackBoon",
		"ElementalBaseDamageBoon",
		"HealthRewardBonusBoon",
		"MaxHealthDamageBoon",
		"WeakPotencyBoon",
		"WeakVulnerabilityBoon",
		"ManaBurstBoon",
		"FocusRawDamageBoon",
		"CharmCrowdBoon",
		"ElementalDodgeBoon",
		"HeraCastBoon",
		"HeraSprintBoon",
		"SwapBonusBoon",
		"BoonDecayBoon",
		"LinkedDeathDamageBoon",
		"DamageSharePotencyBoon",
		"CommonGlobalDamageBoon",
		"HeraManaShieldBoon",
		"ElementalRarityUpgradeBoon",
		"DodgeChanceBoon",
		"HermesCastDiscountBoon",
		"HermesSpecialBoon",
		"HermesWeaponBoon",
		"HexCooldownBuffBoon",
		"SlowProjectileBoon",
		"SorcerySpeedBoon",
		"SprintShieldBoon",
		"TimedKillBuffBoon",
		"TimeStopLastStandBoon",
		"AntiArmorBoon",
		"HeavyArmorBoon",
		"EncounterStartDefenseBuffBoon",
		"ManaToHealthBoon",
		"MassiveKnockupBoon",
		"WeaponUpgradeBoon",
		"ElementalDamageBoon",
		"EchoAllBoon",
		"ApolloSecondStageCastBoon",
		"SprintEchoBoon",
		"EchoBurnBoon",
		"ReboundingSparkBoon",
		"MaximumShareBoon",
		"AllCloseBoon",
		"ManaBurstCountBoon",
		"FirstHitHealBoon",
		"MassiveAoEIncrease",
		"ClearRootBoon",
		"RaiseDeadBoon",
		"BurnOmegaBoon",
		"EmptySlotDamageBoon",
		"SteamBoon",
		"DoubleBurnBoon",
		"CastNovaBoon",
		"CastAnywhereBoon",
		"OmegaCastVolleyBoon",
	}

	for _, traitName in ipairs( startTraits ) do
		if TraitData[traitName] ~= nil and not HeroHasTrait( traitName ) then
			local success, err = pcall(function()
				AddTraitToHero({ TraitName = traitName, Rarity = "Epic" })
			end)
			if not success then
				DebugPrint({ Text = "_boss_custom_traits failed on "..traitName..": "..tostring(err) })
			end
		end
	end
end

function StartRoom( currentRun, currentRoom )
	BossOriginalStartRoom( currentRun, currentRoom )
	thread( BossApplyCustomTraits )
end
